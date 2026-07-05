import { pushToast } from "./toaster.js";

export function useToast() {
  return {
    toast: (message: string) => pushToast(message),
  };
}
