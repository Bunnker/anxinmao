// App 构建(BUILD_TARGET=app)时,webpack NormalModuleReplacementPlugin 将所有
// src/app/api/**/route.ts 替换为此文件。
// 静态导出不支持动态 API 路由;App 壳通过 NEXT_PUBLIC_API_BASE 直连 Web 服务端 API。
// force-static 告诉 Next.js output:'export' 模式此路由已声明为静态,跳过动态检查。
export const dynamic = "force-static";

export async function GET() {
  return new Response(null, { status: 404 });
}
