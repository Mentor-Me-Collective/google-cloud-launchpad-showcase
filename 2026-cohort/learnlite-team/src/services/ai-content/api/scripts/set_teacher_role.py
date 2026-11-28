"""
Give or remove the teacher role (Firebase custom claim  role="teacher").

Admins only. Custom claims can only be set with the Firebase Admin SDK, which is why users
cannot make themselves teachers. Run from a trusted machine with admin credentials:

    gcloud auth application-default login
    python scripts/set_teacher_role.py --project YOUR_PROJECT --email teacher@example.org --role teacher
    python scripts/set_teacher_role.py --project YOUR_PROJECT --email teacher@example.org --role student

Other existing claims are kept. When the role is removed or lowered, the user's refresh tokens
are revoked, so old teacher tokens stop working immediately (the API checks revocation).
The user must sign in again (or refresh the ID token) to pick up a new role.
"""
import argparse

import firebase_admin
from firebase_admin import auth

ROLES = {"teacher", "student", "none"}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--project", required=True, help="Firebase / Google Cloud project ID")
    who = ap.add_mutually_exclusive_group(required=True)
    who.add_argument("--email")
    who.add_argument("--uid")
    ap.add_argument("--role", required=True, choices=sorted(ROLES))
    a = ap.parse_args()

    firebase_admin.initialize_app(options={"projectId": a.project})
    user = auth.get_user_by_email(a.email) if a.email else auth.get_user(a.uid)
    claims = dict(user.custom_claims or {})
    before = claims.get("role")
    if a.role == "none":
        claims.pop("role", None)
    else:
        claims["role"] = a.role
    auth.set_custom_user_claims(user.uid, claims or None)
    if before == "teacher" and a.role != "teacher":
        auth.revoke_refresh_tokens(user.uid)
        print("Teacher role removed and sessions revoked.")
    print(f"{user.email or user.uid}: role {before!r} -> {claims.get('role')!r}")


if __name__ == "__main__":
    main()
