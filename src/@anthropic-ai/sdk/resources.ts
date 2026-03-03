// Stub for @anthropic-ai/sdk/resources
export type ImageBlock = {
  type: "image";
  source: {
    type: "base64";
    media_type: string;
    data: string;
  };
};

export type ImageBlockParam = ImageBlock;

export type DocumentBlock = {
  type: "document";
  source: {
    type: "base64" | "text";
    media_type: string;
    data: string;
  };
};

export type DocumentBlockParam = DocumentBlock;

export type ContentBlock = ImageBlock | DocumentBlock | { type: "text"; text: string };
