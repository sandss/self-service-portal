import asyncio
import re

def validate(inputs):
    """Validate user registration inputs"""
    username = inputs.get("username", "").strip()
    email = inputs.get("email", "").strip()
    
    if not username:
        raise ValueError("Username is required")
    
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        raise ValueError("Username can only contain letters, numbers, and underscores")
    
    if not email:
        raise ValueError("Email is required")
    
    if not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
        raise ValueError("Invalid email format")
    
    return inputs

async def run(inputs, progress_callback=None):
    """
    Register a new user with progress reporting
    
    Args:
        inputs: User registration parameters
        progress_callback: Optional async function to report progress
    """
    
    if progress_callback:
        await progress_callback(5, "Starting user registration process")
    
    username = inputs["username"]
    email = inputs["email"]
    full_name = inputs["fullName"]
    department = inputs["department"]
    role = inputs.get("role", "user")
    send_welcome = inputs.get("sendWelcomeEmail", True)
    
    # Step 1: Validate uniqueness
    if progress_callback:
        await progress_callback(15, "Checking username and email availability")
    await asyncio.sleep(0.3)  # Simulate database check
    
    # Step 2: Create user profile
    if progress_callback:
        await progress_callback(35, "Creating user profile")
    await asyncio.sleep(0.4)  # Simulate user creation
    
    user_id = f"user_{username}_{hash(email) % 10000}"
    
    # Step 3: Set up permissions
    if progress_callback:
        await progress_callback(55, f"Setting up {role} permissions")
    await asyncio.sleep(0.2)  # Simulate permission setup
    
    # Step 4: Create directory structure
    if progress_callback:
        await progress_callback(70, "Creating user directory and workspace")
    await asyncio.sleep(0.3)  # Simulate directory creation
    
    # Step 5: Send welcome email (if requested)
    email_sent = False
    if send_welcome:
        if progress_callback:
            await progress_callback(85, "Sending welcome email")
        await asyncio.sleep(0.2)  # Simulate email sending
        email_sent = True
    else:
        if progress_callback:
            await progress_callback(85, "Skipping welcome email")
    
    # Step 6: Final setup
    if progress_callback:
        await progress_callback(95, "Finalizing user registration")
    await asyncio.sleep(0.1)
    
    result = {
        "success": True,
        "user_id": user_id,
        "username": username,
        "email": email,
        "full_name": full_name,
        "department": department,
        "role": role,
        "welcome_email_sent": email_sent,
        "profile_url": f"/users/{user_id}",
        "created_at": "2024-01-15T10:30:00Z"
    }
    
    if progress_callback:
        await progress_callback(100, f"User {username} registered successfully")
    
    return result
