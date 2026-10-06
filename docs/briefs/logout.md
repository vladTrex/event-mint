# Feature Brief

## Title

User Logout

## Background

Currently EventMint supports login and refresh tokens.
Users stay authenticated until the refresh token expires.
There is currently no way to explicitly terminate a session.

## Problem

If a user signs in on a shared computer or wants to end their session, they cannot invalidate it.
This is a security gap.

## Goal

Allow authenticated users to log out.

After logout the current session should no longer be usable.

## Success Criteria

- Users can explicitly terminate a session.
- Logging out prevents further session continuation.
- Existing login flow continues to work.

## Out of Scope

- Multi-device session management
- Logout from all devices
- User profile changes
- RBAC

## Notes

Current implementation already supports:

- login
- refresh tokens

Implementation details are intentionally left undefined.