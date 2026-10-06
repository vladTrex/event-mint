# Status: approved

Feature: User Logout
  As an authenticated user
  I want to log out of my current session
  So that the session cannot be continued by obtaining new tokens

  # Acceptance criteria
  # - An authenticated user can log out of the current session.
  # - After logout, that session cannot be refreshed and no new tokens are issued for it.
  # - Already issued access tokens may remain valid until they expire.
  # - Logging out affects only the current session.
  # - Other active sessions of the same user remain valid.
  # - Logging out the same session more than once succeeds without affecting other sessions.
  # - The user can log in again after logout and start a new session.
  # - Existing login and refresh behavior for other active sessions remains unchanged.

  Scenario: Authenticated user logs out
    Given a user has logged in and has an active session
    When the user logs out
    Then the logout succeeds
    And the current session is terminated

  Scenario: Session cannot be continued after logout
    Given a user has logged out of a session
    When the user tries to refresh that session
    Then the refresh is rejected
    And no new tokens are issued

  Scenario: Already issued access token remains valid until expiration
    Given a user has logged out of a session
    And an access token from that session has not expired
    When the access token is used
    Then its validity is unchanged by logout

  Scenario: Logout without valid session credentials
    Given a request does not identify a valid session
    When it attempts to log out
    Then the logout is rejected

  Scenario: Logging out twice
    Given a user has already logged out of a session
    When the user logs out of the same session again
    Then the logout succeeds
    And no other session is affected

  Scenario: Logout does not affect other sessions
    Given a user has two active sessions
    When the user logs out of one session
    Then that session is terminated
    And the other session remains active

  Scenario: Login after logout
    Given a user has logged out
    When the user logs in with valid credentials
    Then a new session is created
    And the user receives new tokens

  Scenario: Existing login flow is unchanged
    Given a user has valid credentials
    When the user logs in
    Then the user receives tokens as before

  Scenario: Existing refresh flow for other sessions is unchanged
    Given a user has another active session
    When the user refreshes that session
    Then the refresh succeeds as before