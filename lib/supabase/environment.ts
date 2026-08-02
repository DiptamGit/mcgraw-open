import "server-only";

import { z } from "zod";

const publicEnvironmentSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(1),
});

const privilegedEnvironmentSchema = publicEnvironmentSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export type PublicSupabaseEnvironment = z.infer<
  typeof publicEnvironmentSchema
>;
export type PrivilegedSupabaseEnvironment = z.infer<
  typeof privilegedEnvironmentSchema
>;

function readEnvironment<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
): z.output<z.ZodObject<T>> {
  const result = schema.safeParse(process.env);

  if (!result.success) {
    const variables = [
      ...new Set(
        result.error.issues
          .map((issue) => issue.path[0])
          .filter((name): name is string => typeof name === "string"),
      ),
    ];

    throw new Error(
      `Invalid server configuration: ${variables.join(", ")} ${
        variables.length === 1 ? "is" : "are"
      } missing or invalid.`,
      { cause: result.error },
    );
  }

  return result.data;
}

export function getPublicSupabaseEnvironment(): PublicSupabaseEnvironment {
  return readEnvironment(publicEnvironmentSchema);
}

export function getPrivilegedSupabaseEnvironment(): PrivilegedSupabaseEnvironment {
  return readEnvironment(privilegedEnvironmentSchema);
}
