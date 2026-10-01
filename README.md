# 回到家 · 3D 漫游 2.0

在线体验：[schoolroom.pages.dev](https://schoolroom.pages.dev/)。

依据参考照片建立的 Three.js 室内场景，保留双侧上床下桌、入口衣柜、储物楼梯、洗漱区、浴室及封闭阳台的关系。空间按体验适当放宽，尺寸和不可见区域为近似还原。

本次修正站立视线与场景比例，加宽通道；豆豆从入口前方开始，可以跟随、自由散步、坐下和摇尾巴。门、打开的柜门、抽屉和家具参与碰撞。楼梯可连续登阶到上铺，再沿原路下来。

## 操作

- WASD / 方向键：行走；Shift：快走。
- 按住画面拖动：环顾；「锁定鼠标」后直接环顾，Esc 释放。
- E：使用附近的门、衣柜、水龙头、楼梯，或摸摸豆豆。
- 靠近书桌：点击台灯、电脑、抽屉按钮。
- F：切换豆豆跟随 / 自由活动；G 或「看豆豆」：转向它。
- M：打开地图，可快速前往房间、书桌、楼梯和衣柜。
- C：开合窗帘；右上角可切换昼夜与声音。
- 手机上使用左下摇杆行走，拖动画面环顾。

## 开发和检查

```text
npm install
npm run dev
npm run check
npm run build
```

`npm run check` 使用实际场景的碰撞数据，验证各房间在门开关后的可达性、路径是否穿墙、快走是否穿过家具、楼梯视线是否穿顶、抽屉碰撞范围及豆豆绕开人的路径。

发布目录为 `dist`。运行时资源均包含在发布目录中，无需外部模型或字体 CDN。

## 更新 Cloudflare Pages

在现有 `schoolroom` 项目创建一次新的生产部署，上传构建后的 `dist` 文件夹或以其中内容为根目录的 ZIP。无需新建项目。部署包包含 `index.html`、`assets`、`favicon.svg` 和缓存配置。

参考：[Cloudflare Direct Upload 官方说明](https://developers.cloudflare.com/pages/get-started/direct-upload/)。公开地址只有完成上传并部署后才会更新。
