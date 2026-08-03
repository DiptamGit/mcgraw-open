import "server-only";

import { z } from "zod";

const organizerEnvironmentSchema = z.object({
  ORGANIZER_PIN: z.string().min(4).max(128),
  ORGANIZER_COOKIE_SECRET: z.string().min(32),
});

export type OrganizerEnvironment = z.infer<typeof organizerEnvironmentSchema>;

export function getOrganizerEnvironment(): OrganizerEnvironment {
  const result = organizerEnvironmentSchema.safeParse(process.env);

  if (!result.success) {
    const variables = [
      ...new Set(
        result.error.issues
          .map((issue) => issue.path[0])
          .filter((name): name is string => typeof name === "string"),
      ),
    ];

    throw new Error(
      `Invalid organizer configuration: ${variables.join(", ")} ${
        variables.length === 1 ? "is" : "are"
      } missing or invalid.`,
      { cause: result.error },
    );
  }

  return result.data;
}
