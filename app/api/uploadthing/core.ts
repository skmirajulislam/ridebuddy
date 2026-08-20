import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  hazardImageUploader: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      // Return metadata to attach to the uploaded file
      return { uploadedAt: new Date().toISOString() };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("[UploadThing] Hazard image uploaded:", file.url, "metadata:", metadata);
      return { url: file.url, name: file.name, size: file.size };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
