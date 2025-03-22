
// Convenience method for updating frontend status
// as seen by the end user.
export const status = (message: string) => {
    self.postMessage({
      type: "status",
      data: {
        message
      }
    })
  }
  // Convenience method for posting error message
  // to the frontend. Conditional handling may apply.
export const postError = (message: string) => {
    self.postMessage({
      type: "error",
      data: {
        message
      }
    })
}

export function validateAndGetAccessToken(message: MessageEvent) {
    status(`Validating`);
    if (!message.data || !message.data.data) {
      postError("Invalid message format");
      return null;
    }
    const { data: { user } } = message.data;
    if (typeof user === "undefined" || !user) {
      postError("Missing user data")
      return null
    }
    let userData: any;
    try {
      userData = JSON.parse(user);
    } catch {
      postError("Invalid user data");
      return null
    }
    const { token: { access_token = null } } = userData;
    if (!access_token) {
      postError("Missing access token")
      return null
    }
    return access_token
  }