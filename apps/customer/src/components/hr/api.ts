import { supabase } from "@/integrations/supabase/client";

async function invokeEdgeFunction(functionName: string, data?: any) {
  const { data: result, error } = await supabase.functions.invoke(functionName, {
    body: data,
  });

  if (error) {
    const contextBody = (error as any)?.context?.body;
    const details = typeof contextBody === 'string'
      ? contextBody
      : contextBody
      ? JSON.stringify(contextBody)
      : '';
    const message = details ? `${error.message}: ${details}` : error.message;
    const enrichedError = new Error(message);
    (enrichedError as any).status = (error as any)?.status;
    throw enrichedError;
  }
  return result;
}

export const docsAPI = {
  get: async (endpoint: string) => {
    if (endpoint === "/documents/templates") {
      return invokeEdgeFunction("document-templates");
    }
    throw new Error(`Unsupported GET endpoint: ${endpoint}`);
  },
  post: async (endpoint: string, data?: any) => {
    if (endpoint === "/documents/generate") {
      return invokeEdgeFunction("document-generate", data);
    }
    if (endpoint === "/documents/purge") {
      return invokeEdgeFunction("purge-executive-documents", data);
    }
    throw new Error(`Unsupported POST endpoint: ${endpoint}`);
  },
};

