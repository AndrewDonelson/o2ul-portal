import { pushToast } from "./toaster";

export function useToast() {
  return {
    toast: (message: string) => pushToast(message),
  };
}
