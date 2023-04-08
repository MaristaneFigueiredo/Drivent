import { request } from "@/utils/request";
import { notFoundError, cepNotExistsError, cepInvalidError, requestError } from "@/errors";
import addressRepository, { CreateAddressParams } from "@/repositories/address-repository";
import enrollmentRepository, { CreateEnrollmentParams } from "@/repositories/enrollment-repository";
import { exclude } from "@/utils/prisma-utils";
import { Address, Enrollment } from "@prisma/client";
import {ViaCEPAddress} from "@/protocols"

async function getAddressFromCEP(cep:string): Promise<ViaCEPAddress> {
  const result = await request.get(`https://viacep.com.br/ws/${cep}/json/`);
  //const result = await request.get(`${process.env.VIA_CEP_API}/${cep}/json/`);
  
  const cepValid = cepValidation(cep)
  if(!cepValid) {
    throw cepInvalidError();
  }

  if (!result.data) {    
    throw notFoundError();
  }

  if (result.data.erro) {   
    throw cepNotExistsError();   
  }

  const address = {
    logradouro: result.data.logradouro,
    complemento: result.data.complemento,
    bairro: result.data.bairro, 
    cidade: result.data.localidade,
    uf: result.data.uf,
  };

  return address
}

async function getOneWithAddressByUserId(userId: number): Promise<GetOneWithAddressByUserIdResult> {
  const enrollmentWithAddress = await enrollmentRepository.findWithAddressByUserId(userId);

  if (!enrollmentWithAddress) throw notFoundError();

  const [firstAddress] = enrollmentWithAddress.Address;
  const address = getFirstAddress(firstAddress);

  return {
    ...exclude(enrollmentWithAddress, "userId", "createdAt", "updatedAt", "Address"),
    ...(!!address && { address }),
  };
}

type GetOneWithAddressByUserIdResult = Omit<Enrollment, "userId" | "createdAt" | "updatedAt">;

function getFirstAddress(firstAddress: Address): GetAddressResult {
  if (!firstAddress) return null;

  return exclude(firstAddress, "createdAt", "updatedAt", "enrollmentId");
}

type GetAddressResult = Omit<Address, "createdAt" | "updatedAt" | "enrollmentId">;

async function createOrUpdateEnrollmentWithAddress(params: CreateOrUpdateEnrollmentWithAddress) {
  const enrollment = exclude(params, "address");
  const address = getAddressForUpsert(params.address);

  //TODO - Verificar se o CEP é válido
  const newEnrollment = await enrollmentRepository.upsert(params.userId, enrollment, exclude(enrollment, "userId"));

  await addressRepository.upsert(newEnrollment.id, address, address);
}

function getAddressForUpsert(address: CreateAddressParams) {
  return {
    ...address,
    ...(address?.addressDetail && { addressDetail: address.addressDetail }),
  };
}

export type CreateOrUpdateEnrollmentWithAddress = CreateEnrollmentParams & {
  address: CreateAddressParams;
};

export function cepValidation(cep: string): boolean
{
  const numbers ="0123456789";
  const cepSanitized = cep.replace("-", "");
  const arrayCep = cepSanitized.split("");
  
  const isLengthEquals8 = arrayCep.length === 8;
  const isCepZeros = isLengthEquals8 && cepSanitized === "00000000";
  const  isAllNumeric = arrayCep.map( (e) => numbers.includes(e) ).every( e => e === true);
  const isCepValid = isLengthEquals8 && isAllNumeric && !isCepZeros;

  return isCepValid;
}


const enrollmentsService = {
  getOneWithAddressByUserId,
  createOrUpdateEnrollmentWithAddress,
  getAddressFromCEP,
  cepValidation
};

export default enrollmentsService;
