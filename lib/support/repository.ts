import { hasDatabase } from "@/lib/db/postgres";
import { SupportCapacityError, SupportStorageError } from "@/lib/support/errors";
import * as fileRepository from "@/lib/support/repository-file";
import * as postgresRepository from "@/lib/support/repository-postgres";

export { SupportCapacityError, SupportStorageError };

function backend() {
  if (hasDatabase()) return postgresRepository;

  if (process.env.NODE_ENV === "production") {
    throw new SupportStorageError(
      "DATABASE_URL is required for support chat in production"
    );
  }

  return fileRepository;
}

export async function getOrCreateConversation(
  input: Parameters<typeof fileRepository.getOrCreateConversation>[0]
) {
  return backend().getOrCreateConversation(input);
}

export async function getConversation(
  ...args: Parameters<typeof fileRepository.getConversation>
) {
  return backend().getConversation(...args);
}

export async function listMessages(
  ...args: Parameters<typeof fileRepository.listMessages>
) {
  return backend().listMessages(...args);
}

export async function addMessage(
  input: Parameters<typeof fileRepository.addMessage>[0]
) {
  return backend().addMessage(input);
}

export async function listConversations() {
  return backend().listConversations();
}
