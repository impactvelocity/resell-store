import { handleApiRequest } from "../../../../lib/server/api";

/* The public API (lib/server/api). api.resell.store/v1/* is rewritten here by proxy.ts. */

export const dynamic = "force-dynamic";

export const GET = handleApiRequest;
export const POST = handleApiRequest;
export const PATCH = handleApiRequest;
export const PUT = handleApiRequest;
export const DELETE = handleApiRequest;
export const OPTIONS = handleApiRequest;
