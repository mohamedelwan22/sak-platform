import { profileApi } from "@/api/profile.api";

export async function buySak(input: { landId: string; sak: number }) {
  const res = await profileApi.createPaymentRequest({
    type: "buy_sak",
    usdAmount: 0,
  });
  return res.data.data;
}

export async function submitKyc(input: {
  documentType: string;
  frontPath: string;
  backPath: string | null;
  selfiePath: string;
}) {
  const formData = new FormData();
  formData.append("documentType", input.documentType);
  formData.append("frontPath", input.frontPath);
  if (input.backPath) formData.append("backPath", input.backPath);
  formData.append("selfiePath", input.selfiePath);

  const res = await profileApi.uploadKyc(formData);
  return res.data.data;
}
