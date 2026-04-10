贴纸资源
--------
【默认 6 枚】内置 .svg（已随仓库提供），固定动效，无需替换。

【自定义 WebP】
1. 将 my1.webp 等放入本目录。
2. 在 chat.js 的 STICKERS 数组末尾追加一行，例如：
   { id: 'my1', src: 'assets/chat-stickers/my1.webp', alt: '我的1', randomFx: true }
   randomFx: true 时发送会随机一种光效（fx 写入聊天行，轻量）。
3. id 须唯一，与 Firestore 里 k:s 的 v 一致。

建议 WebP：透明底、边长约 64～128 px，适当压缩。
