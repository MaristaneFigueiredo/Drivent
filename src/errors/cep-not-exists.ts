import { ApplicationError } from "@/protocols";

export function cepNotExistsError(): ApplicationError {    
  return {
    name: "CepNotExistsError",
    message: "This CEP does not exist!",
  };
}
