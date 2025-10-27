import asyncio
import json
from datetime import datetime
from typing import Any, Dict, List, Tuple

import fakeredis.aioredis
import pytest

from worker.job_status import fetch_job_metadata
from worker.sync_catalog_item import run_sync_catalog_item_from_git


class _ConstTempDir:
    def __init__(self, path: str):
        self._path = path

    def __enter__(self) -> str:
        return self._path

    def __exit__(self, exc_type, exc, tb) -> bool:
        return False


@pytest.mark.asyncio
async def test_run_sync_catalog_item_from_git_success(monkeypatch, tmp_path, fakeredis_server):
    job_id = "job-sync-test"
    payload = {
        "repo_url": "https://example.com/repo.git",
        "ref": "demo-item@v1.0.0",
    }

    repo_dir = tmp_path / "repo"
    item_dir = repo_dir / "items" / "demo-item"
    item_dir.mkdir(parents=True)

    (item_dir / "manifest.yaml").write_text("id: demo-item\nversion: 1.0.0\n")
    (item_dir / "schema.json").write_text(json.dumps({"type": "object"}))
    (item_dir / "ui.json").write_text(json.dumps({}))

    bundles_dir = tmp_path / "bundles"
    monkeypatch.setattr("worker.sync_catalog_item.BUNDLES_DIR", str(bundles_dir))

    git_commands: List[Tuple[Tuple[str, ...], str]] = []

    def fake_git_runner(args: Tuple[str, ...], cwd: str) -> str:
        git_commands.append((args, cwd))
        return ""

    atomic_writes: List[Tuple[str, bytes]] = []

    def fake_atomic_write(path: str, data: bytes) -> None:
        atomic_writes.append((path, data))

    upsert_calls: List[Dict[str, Any]] = []

    def fake_upsert_version(**kwargs: Any) -> None:
        upsert_calls.append(kwargs)

    fixed_now = datetime(2024, 1, 1, 12, 0, 0)

    def now() -> datetime:
        return fixed_now

    def tempdir_factory():
        return _ConstTempDir(str(repo_dir))

    redis_client = fakeredis.aioredis.FakeRedis(server=fakeredis_server)
    try:
        result = await run_sync_catalog_item_from_git(
            redis_client,
            job_id,
            payload,
            git_runner=fake_git_runner,
            tempdir_factory=tempdir_factory,
            now=now,
            atomic_write_func=fake_atomic_write,
            upsert_version_func=fake_upsert_version,
        )
    finally:
        await redis_client.aclose()

    assert result["item_id"] == "demo-item"
    assert result["version"] == "1.0.0"
    assert atomic_writes and atomic_writes[0][0] == str(bundles_dir / "demo-item@1.0.0.tar.gz")
    assert upsert_calls and upsert_calls[0]["item_id"] == "demo-item"

    assert ("git", "init") in [cmd[0] for cmd in git_commands]
    assert any("--tags" in cmd[0] for cmd in git_commands)

    redis_check = fakeredis.aioredis.FakeRedis(server=fakeredis_server)
    try:
        metadata, _ = await fetch_job_metadata(redis_check, job_id)
    finally:
        await redis_check.aclose()

    assert metadata["state"] == "SUCCEEDED"
    assert metadata["progress"] == 100
    assert metadata["result"]["bundle_path"].endswith("demo-item@1.0.0.tar.gz")


def test_sync_catalog_item_from_git_task_eager(monkeypatch, celery_eager_app, fakeredis_server, tmp_path):
    from worker.celery_tasks import sync_catalog_item_from_git

    job_id = "celery-git-job"
    payload = {
        "repo_url": "https://example.com/repo.git",
        "ref": "demo-item@v1.2.3",
    }

    repo_dir = tmp_path / "repo"
    item_dir = repo_dir / "items" / "demo-item"
    item_dir.mkdir(parents=True)

    (item_dir / "manifest.yaml").write_text("id: demo-item\nversion: 1.2.3\n")
    (item_dir / "schema.json").write_text(json.dumps({"type": "object"}))
    (item_dir / "ui.json").write_text(json.dumps({}))

    bundles_dir = tmp_path / "bundles"
    monkeypatch.setattr("worker.sync_catalog_item.BUNDLES_DIR", str(bundles_dir))

    def fake_tempdir_factory():
        return _ConstTempDir(str(repo_dir))

    monkeypatch.setattr("worker.sync_catalog_item.tempfile.TemporaryDirectory", fake_tempdir_factory)

    def fake_git_runner(args: Tuple[str, ...], *, cwd: str) -> str:
        return ""

    monkeypatch.setattr("worker.sync_catalog_item._default_git_runner", fake_git_runner)

    atomic_writes: List[Tuple[str, bytes]] = []

    def fake_atomic_write(path: str, data: bytes) -> None:
        atomic_writes.append((path, data))

    monkeypatch.setattr("worker.sync_catalog_item.atomic_write", fake_atomic_write)

    upsert_calls: List[Dict[str, Any]] = []

    def fake_upsert_version(**kwargs: Any) -> None:
        upsert_calls.append(kwargs)

    monkeypatch.setattr("worker.sync_catalog_item.upsert_version", fake_upsert_version)

    def fake_from_url(_url: str, *args: Any, **kwargs: Any):
        return fakeredis.aioredis.FakeRedis(server=fakeredis_server)

    monkeypatch.setattr("worker.celery_tasks.redis.from_url", fake_from_url)

    result = sync_catalog_item_from_git.delay(job_id, payload)
    assert result.result is None

    async def load_metadata():
        redis_client = fakeredis.aioredis.FakeRedis(server=fakeredis_server)
        try:
            metadata, _ = await fetch_job_metadata(redis_client, job_id)
        finally:
            await redis_client.aclose()
        return metadata

    metadata = asyncio.run(load_metadata())

    assert metadata["state"] == "SUCCEEDED"
    assert metadata["result"]["item_id"] == "demo-item"
    assert upsert_calls and upsert_calls[0]["version"] == "1.2.3"
    assert atomic_writes and atomic_writes[0][0].endswith("demo-item@1.2.3.tar.gz")