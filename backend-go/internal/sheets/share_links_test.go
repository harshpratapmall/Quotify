package sheets

import (
	"testing"
	"time"
)

func TestShareLinkIsActive(t *testing.T) {
	base := time.Date(2026, 9, 11, 12, 0, 0, 0, istLocation)

	tests := []struct {
		name   string
		link   ShareLink
		now    time.Time
		active bool
	}{
		{
			name:   "fresh link with future expiry",
			link:   ShareLink{ID: "SH-1", ExpiresAt: "11-09-2026 13:00:00"},
			now:    base,
			active: true,
		},
		{
			name:   "link past its expiry",
			link:   ShareLink{ID: "SH-1", ExpiresAt: "11-09-2026 11:00:00"},
			now:    base,
			active: false,
		},
		{
			name:   "revoked link",
			link:   ShareLink{ID: "SH-1", ExpiresAt: "11-09-2026 13:00:00", RevokedAt: "11-09-2026 12:30:00"},
			now:    base,
			active: false,
		},
		{
			name:   "legacy link with no expiry ages out from created_at",
			link:   ShareLink{ID: "SH-1", CreatedAt: "01-08-2026 10:00:00"},
			now:    base,
			active: false,
		},
		{
			name:   "legacy link with no expiry still fresh",
			link:   ShareLink{ID: "SH-1", CreatedAt: "01-09-2026 10:00:00"},
			now:    base,
			active: true,
		},
		{
			name:   "legacy RFC3339 UTC expiry",
			link:   ShareLink{ID: "SH-1", ExpiresAt: "2026-09-11T07:30:00Z"},
			now:    time.Date(2026, 9, 11, 12, 0, 0, 0, istLocation),
			active: true,
		},
		{
			name:   "empty id",
			link:   ShareLink{},
			now:    base,
			active: false,
		},
	}

	for _, test := range tests {
		got := ShareLinkIsActive(test.link, test.now)
		if got != test.active {
			t.Errorf("%s: ShareLinkIsActive = %v, want %v", test.name, got, test.active)
		}
	}
}

func TestISTTimestampLayout(t *testing.T) {
	value := time.Date(2026, 9, 11, 6, 30, 0, 0, time.UTC)
	got := ISTTimestamp(value)
	want := "11-09-2026 12:00:00"
	if got != want {
		t.Fatalf("ISTTimestamp = %q, want %q", got, want)
	}
}
