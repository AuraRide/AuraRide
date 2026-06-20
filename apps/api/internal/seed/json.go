package seed

import "encoding/json"

// marshalJSON is a tiny wrapper so seed.go doesn't import encoding/json at
// every call site — kept here so it's easy to swap for jsoniter later.
func marshalJSON(v any) (string, error) {
	b, err := json.Marshal(v)
	if err != nil {
		return "", err
	}
	return string(b), nil
}
