import { Capacitor } from "@capacitor/core";

// 是否运行在原生 App(Capacitor)壳内。Web/PWA 为 false。
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

// 原生下弹「拍照 / 从相册选」二选一,返回 dataURL(data:image/...;base64,...);取消/失败返回 null。
// 动态 import 避免 web/静态构建强依赖原生插件(双构建边界)。
// 注:用 @capacitor/camera 8.x 的 getPhoto(Prompt+DataUrl)——8.x 标 deprecated 但可用;
// 已 pin ^8.2.0,升 v9 前需迁到 takePhoto/chooseFromGallery(返回 URI、要再转 dataURL)。
export async function pickPhotoDataUrl(): Promise<string | null> {
  try {
    const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
    const photo = await Camera.getPhoto({
      source: CameraSource.Prompt,
      resultType: CameraResultType.DataUrl,
      quality: 80,
      promptLabelHeader: "添加照片",
      promptLabelPicture: "拍照",
      promptLabelPhoto: "从相册选",
      promptLabelCancel: "取消",
    });
    return photo.dataUrl ?? null;
  } catch {
    return null; // 用户取消 / 权限拒 / 出错 → 当没选
  }
}
