package middleware

import (
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

// Logger writes one structured line per request to the stdlib log. Cheap and
// matches what systemd-journald wants.
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		dur := time.Since(start)
		log.Printf("%s %s %d %s %s",
			c.Request.Method, c.Request.URL.Path, c.Writer.Status(),
			dur.Truncate(time.Millisecond), c.ClientIP(),
		)
	}
}
