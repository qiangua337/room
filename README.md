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

## 分支和自动发布

新版保存在 `home-v2` 分支，它也是仓库默认分支和 Cloudflare Pages 的生产分支。`main` 保留原版，供回看和对照。

Cloudflare 的 `schoolroom` 项目已连接 GitHub 仓库 `qiangua337/room`。以后将改动提交到 `home-v2`，Cloudflare 会自动构建并更新 [schoolroom.pages.dev](https://schoolroom.pages.dev/)。

构建命令为 `npm run build`，发布目录为 `dist`。其他分支生成预览部署，不会替换正式网站。

参考：[Cloudflare 分支部署设置](https://developers.cloudflare.com/pages/configuration/branch-build-controls/)。
