// 分诊引擎 API —— 占位。
// 端口到 LLM 时实现:接收症状与追问答案,走"红线规则(写死)+ 大模型理解/解释"
// 两段,返回风险分级(红/黄/绿)与建议。密钥仅在此服务端使用。
export async function POST(): Promise<Response> {
  return Response.json(
    { error: "triage engine not implemented yet" },
    { status: 501 },
  );
}
