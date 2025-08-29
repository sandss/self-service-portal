from jsonschema import validate, Draft7Validator

REQUIRED_MANIFEST_FIELDS = ["id", "name", "version", "entrypoint"]

def validate_manifest(m: dict):
    for k in REQUIRED_MANIFEST_FIELDS:
        if k not in m:
            raise ValueError(f"manifest missing field: {k}")

def validate_schema(s: dict):
    Draft7Validator.check_schema(s)  # raises if invalid

def validate_inputs(schema: dict, inputs: dict):
    validate(instance=inputs, schema=schema)
