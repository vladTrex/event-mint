# Password Reset — Brief

Users who forget their password need a way to regain access to their account.

The system should allow a user to request a password reset and then set a new password using a temporary reset token.

The reset token must be single-use and expire after a limited period.

For this iteration, sending a real email is out of scope. The reset flow should be testable locally without an external email provider.

Existing login behavior should continue working normally after the password has been successfully changed.