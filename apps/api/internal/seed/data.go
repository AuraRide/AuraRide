// Package seed loads demo data when SEED_ENABLED=true. Idempotent via the
// `seed_marker` table.
package seed

import (
	"fmt"

	"github.com/auraride/auraride/apps/api/internal/models"
)

// Users matches plan §9 — me + 5 sample handles.
var Users = []models.User{
	{ID: "me", Handle: "我", AvatarColor: "#3a2817", DominantColorID: "explore-yellow"},
	{ID: "u1", Handle: "拾光的人", AvatarColor: "#3a9b4e", DominantColorID: "calm-green"},
	{ID: "u2", Handle: "深水区", AvatarColor: "#2f6fd6", DominantColorID: "lonely-blue"},
	{ID: "u3", Handle: "街角折返", AvatarColor: "#eba81b", DominantColorID: "explore-yellow"},
	{ID: "u4", Handle: "直道燃尽", AvatarColor: "#d23b2c", DominantColorID: "release-red"},
	{ID: "u5", Handle: "无轨之风", AvatarColor: "#7c858d", DominantColorID: "tired-gray"},
}

// SeedRide is the compact internal shape used to expand into ride+photos+post.
type SeedRide struct {
	ID            string
	UserID        string
	ColorID       string
	Distance      float64
	DurationSec   int
	StartedAt     int64
	MoodText      string
	DominantColor string
	City          string
	PhotoCount    int
}

// Rides — 5 pre-recorded Shanghai routes, one per emotion bucket.
var Rides = []SeedRide{
	{"r-binjiang", "u1", "calm-green", 4.5, 1620, 1718503200000, "傍晚的江堤,风把心跳调回了潮汐。", "#34E89E", "上海 · 北外滩", 6},
	{"r-suzhou", "u2", "lonely-blue", 8.2, 2880, 1718416800000, "一个人潜进暗蓝,喧嚣全沉到底。", "#4FA8FF", "上海 · 苏州河", 6},
	{"r-hengfu", "u3", "explore-yellow", 3.8, 1500, 1718330400000, "宽街收着回声,慢慢走过老城。", "#FFB54A", "上海 · 衡复风貌区", 5},
	{"r-yangpu", "u4", "release-red", 6.7, 2400, 1718244000000, "把不安全部留在直道上,呼吸归位。", "#FF3344", "上海 · 杨浦滨江", 6},
	{"r-houtan", "u5", "tired-gray", 5.5, 2100, 1718157600000, "做一阵没有轨迹的风,谁也不必看见。", "#C9D2D8", "上海 · 后滩公园", 5},
	// me 自己的 3 条骑行,覆盖 3 种颜色,让 Journal / Overview / ShareCard 不空
	{"r-me-pudong", "me", "calm-green", 5.2, 1800, 1718590200000, "陆家嘴跑桥洞,光线在水面上抖。", "#34E89E", "上海 · 陆家嘴", 4},
	{"r-me-xuhui", "me", "lonely-blue", 3.6, 1320, 1718503800000, "雨刚停,徐汇老街只剩自行车铃。", "#4FA8FF", "上海 · 徐汇滨江", 3},
	{"r-me-jingan", "me", "explore-yellow", 7.1, 2520, 1718244600000, "静安寺到南京西路,招牌是橙色的。", "#FFB54A", "上海 · 静安", 5},
}

// SeedComment expands into one row of the `comments` table at seed time. Each
// post 上挂 1-2 条,广场打开就有真互动可见。
type SeedComment struct {
	ID        string
	PostID    string
	AuthorID  string
	Text      string
	CreatedAt int64
}

// Comments — each seed post gets 1-2 comments from a sibling user so 广场 /
// Plaza 的评论区在第一次打开就不空。
var Comments = []SeedComment{
	// u1 北外滩 (calm-green)
	{"cm-binjiang-1", "post-r-binjiang", "u2", "傍晚那段光真好看。", 1718506800000},
	{"cm-binjiang-2", "post-r-binjiang", "me", "下次一起。", 1718507400000},
	// u2 苏州河 (lonely-blue)
	{"cm-suzhou-1", "post-r-suzhou", "u3", "深水区的色织最稳。", 1718420400000},
	// u3 衡复 (explore-yellow)
	{"cm-hengfu-1", "post-r-hengfu", "me", "我也想去走一趟。", 1718334000000},
	{"cm-hengfu-2", "post-r-hengfu", "u4", "老城的回声 +1。", 1718335800000},
	// u4 杨浦滨江 (release-red)
	{"cm-yangpu-1", "post-r-yangpu", "u1", "直道燃尽这名字太对了。", 1718247600000},
	// u5 后滩 (tired-gray)
	{"cm-houtan-1", "post-r-houtan", "me", "灰白比想象中好看。", 1718161200000},
}

// SeedSavedRoute mirrors models.SavedRoute but at seed-time shape — only the
// minimum 字段 we需要; route_shape/cover_color 直接抄 from the source post.
type SeedSavedRoute struct {
	ID         string
	UserID     string
	FromPostID string // always references an existing post in this seed batch
	SavedAt    int64
}

// SavedRoutes — me 收藏了 u4 的 release-red 杨浦滨江,所以 /saved-routes 不空,
// /saved-routes/ids 返 ["post-r-yangpu"](Plaza 上"已收藏"badge 第一次就有得展示)。
var SavedRoutes = []SeedSavedRoute{
	{"sr-me-yangpu", "me", "post-r-yangpu", 1718510000000},
}

// buildPhotos returns the photo rows for one ride.
func buildPhotos(r SeedRide, bucket, region string) []models.Photo {
	out := make([]models.Photo, r.PhotoCount)
	for i := 0; i < r.PhotoCount; i++ {
		cosKey := fmt.Sprintf("seed/%s/%d.jpg", r.ID, i+1)
		cosURL := fmt.Sprintf("https://%s.cos.%s.myqcloud.com/%s", bucket, region, cosKey)
		out[i] = models.Photo{
			ID:         fmt.Sprintf("seed-%s-%d", r.ID, i+1),
			RideID:     r.ID,
			COSKey:     cosKey,
			COSURL:     cosURL,
			Color:      r.DominantColor,
			TakenAt:    r.StartedAt + int64(i*180_000),
			VLMStatus:  "done",
			OrderIndex: i,
		}
	}
	return out
}

// shapeFromSeed mirrors apps/web/src/app/lib/rideRepo.ts so seed posts look
// identical to a route the front end would have drawn locally.
func shapeFromSeed(seed int64, n int) [][2]float64 {
	pts := make([][2]float64, 0, n)
	a := uint32(seed)
	rnd := func() float64 {
		a = a*1664525 + 1013904223
		return float64(a) / 4294967296.0
	}
	x := 0.18 + rnd()*0.1
	y := 0.9
	for i := 0; i < n; i++ {
		pts = append(pts, [2]float64{x, y})
		x += (rnd() - 0.45) * 0.16
		y -= 0.86 / float64(n)
		if x < 0.08 {
			x = 0.08
		} else if x > 0.92 {
			x = 0.92
		}
	}
	return pts
}
