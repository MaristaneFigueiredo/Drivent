import { ApplicationError } from "@/protocols";

export function cepInvalidError(): ApplicationError {
  return {
    name: "CepInvalidError",
    message: "This CEP is not valid!",
  };
}
