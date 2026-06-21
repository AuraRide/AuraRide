// Package cos wraps the Tencent Cloud Object Storage SDK. We only need
// pre-signed PUT URLs for the 3-step direct-upload flow — the API never
// streams photo bytes itself (ECS 6 Mbps would saturate immediately).
package cos

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"time"

	cossdk "github.com/tencentyun/cos-go-sdk-v5"

	"github.com/auraride/auraride/apps/api/internal/config"
)

// PresignClient is the narrow interface handlers depend on, so tests can stub
// the COS round-trip out without a real cloud account.
type PresignClient interface {
	PresignPut(ctx context.Context, key, contentType string, ttl time.Duration) (string, error)
	PublicURL(key string) string
}

// Client is the real COS-backed PresignClient.
type Client struct {
	bucket   string
	region   string
	c        *cossdk.Client
	secretID string
	secretKey string
}

// NewClient returns a configured COS client. In dev (missing keys) the SDK is
// still constructed but PresignPut will fail loudly — that's fine, dev never
// hits this path unless the upload flow is exercised.
func NewClient(cfg *config.Config) *Client {
	host := fmt.Sprintf("https://%s.cos.%s.myqcloud.com", cfg.COSBucket, cfg.COSRegion)
	u, _ := url.Parse(host)
	b := &cossdk.BaseURL{BucketURL: u}
	c := cossdk.NewClient(b, &http.Client{
		Transport: &cossdk.AuthorizationTransport{
			SecretID:  cfg.COSSecretID,
			SecretKey: cfg.COSSecretKey,
		},
		Timeout: 10 * time.Second,
	})
	return &Client{
		bucket: cfg.COSBucket, region: cfg.COSRegion,
		c: c, secretID: cfg.COSSecretID, secretKey: cfg.COSSecretKey,
	}
}

// PresignPut returns a presigned PUT URL for `key`. Caller (front end) must
// PUT with the exact same Content-Type or the signature is rejected.
func (c *Client) PresignPut(ctx context.Context, key, contentType string, ttl time.Duration) (string, error) {
	if c.secretID == "" || c.secretKey == "" {
		return "", fmt.Errorf("cos: missing credentials (set COS_SECRET_ID/COS_SECRET_KEY)")
	}
	opt := &cossdk.PresignedURLOptions{
		Query:  &url.Values{},
		Header: &http.Header{},
	}
	if contentType != "" {
		opt.Header.Set("Content-Type", contentType)
	}
	u, err := c.c.Object.GetPresignedURL(ctx, http.MethodPut, key, c.secretID, c.secretKey, ttl, opt)
	if err != nil {
		return "", fmt.Errorf("cos: presign put: %w", err)
	}
	return u.String(), nil
}

// PublicURL builds the canonical CDN-style URL for a key (no signature needed
// once the object is uploaded — the bucket is publicly readable for photos).
func (c *Client) PublicURL(key string) string {
	return fmt.Sprintf("https://%s.cos.%s.myqcloud.com/%s", c.bucket, c.region, key)
}
