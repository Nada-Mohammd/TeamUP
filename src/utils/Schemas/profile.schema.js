const { z } = require("zod");

const availabilityEnum = ["morning", "evening", "night", "all day"];

const linkSchema = z.object({
  name: z.string().trim().min(1, "Link name cannot be empty."),
  url: z.string().url("Each link must have a valid URL."),
});

const editProfileSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, "First name cannot be empty.")
    .optional(),

  last_name: z
    .string()
    .trim()
    .min(1, "Last name cannot be empty.")
    .optional(),

  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters long.")
    .optional(),

  gpa: z
    .preprocess(
      (val) => (val === undefined || val === "" ? undefined : parseFloat(val)),
      z.number().min(0, "GPA cannot be negative.").max(4, "GPA cannot exceed 4.0.").optional(),
    )
    .optional(),

  availability: z.enum(availabilityEnum).optional(),

  skills: z
    .union([
      z.string().transform((val) => {
        try {
          return JSON.parse(val);
        } catch {
          // Single skill sent as a plain string
          return [val];
        }
      }),
      z.array(z.string().trim()),
    ])
    .optional(),

  links: z
    .union([
      z.string().transform((val) => {
        try {
          return JSON.parse(val);
        } catch {
          throw new Error("Links must be valid JSON.");
        }
      }),
      z.array(linkSchema),
    ])
    .pipe(z.array(linkSchema)),
});

module.exports = { editProfileSchema };