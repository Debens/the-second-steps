export type LoginState = {
  status: "idle" | "error" | "sent";
  message?: string;
};

export const initialLoginState: LoginState = { status: "idle" };
