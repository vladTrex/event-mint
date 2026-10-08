# Status: approved

Feature: Password Reset
  As a user who forgot their password
  I want to request a password reset and set a new password with a temporary reset token
  So that I can regain access to my account

  # Acceptance criteria
  # - A user requests a password reset using their email.
  # - A temporary reset token is issued for an existing account.
  # - The reset token is valid for 15 minutes.
  # - The reset token can be used only once.
  # - Requesting a new reset token invalidates the previous unused token.
  # - Requests for existing and unknown emails return the same response.
  # - No reset token is created for an unknown email.
  # - The new password follows the same password rules as account registration.
  # - After the password is changed, the old password no longer works.
  # - After the password is changed, the user can log in with the new password.
  # - After the password is changed, all existing sessions are invalidated.
  # - The flow is testable locally without sending a real email.
  # - Existing login behavior is otherwise unchanged.

  Scenario: User requests a password reset
    Given a registered user with an email
    When the user requests a password reset using that email
    Then a temporary reset token is issued
    And the reset request succeeds

  Scenario: Reset request for an unknown email
    Given no account exists with the provided email
    When a password reset is requested using that email
    Then the reset request returns the same response as for an existing account
    And no reset token is created

  Scenario: User sets a new password with a valid reset token
    Given a user has a valid reset token
    When the user sets a valid new password with that token
    Then the password is changed
    And the reset token becomes unusable

  Scenario: Login with the new password after reset
    Given a user has successfully reset their password
    When the user logs in with the new password
    Then the user receives tokens as before

  Scenario: Old password stops working after reset
    Given a user has successfully reset their password
    When the user logs in with the old password
    Then the login is rejected

  Scenario: Reset token cannot be used twice
    Given a user has already used a reset token to set a new password
    When the same reset token is used again
    Then the reset is rejected
    And the password is unchanged

  Scenario: Expired reset token is rejected
    Given a reset token was issued more than 15 minutes ago
    When the user tries to set a new password with that token
    Then the reset is rejected
    And the password is unchanged

  Scenario: Invalid reset token is rejected
    Given a token that was never issued as a reset token
    When the user tries to set a new password with it
    Then the reset is rejected
    And the password is unchanged

  Scenario: New reset request invalidates the previous token
    Given a user has an unused reset token
    When the user requests another password reset
    Then a new reset token is issued
    And the previous reset token becomes unusable

  Scenario: New password must satisfy registration password rules
    Given a user has a valid reset token
    When the user tries to set a password that does not satisfy the registration password rules
    Then the reset is rejected
    And the password is unchanged
    And the reset token remains usable

  Scenario: Existing sessions are invalidated after password reset
    Given a user has an active session
    And the user has a valid reset token
    When the user successfully resets their password
    Then the existing session can no longer be continued

  Scenario: Password reset can be completed without an email provider
    Given the system runs locally without an email provider
    When a registered user requests a password reset
    Then the reset token is available locally
    And the user can complete the password reset flow

  Scenario: Existing login flow is unchanged
    Given a user has valid credentials and has not reset their password
    When the user logs in
    Then the user receives tokens as before