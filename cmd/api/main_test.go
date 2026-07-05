package main

import "testing"

func TestExtractPort(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{name: "empty", in: "", want: ""},
		{name: "colon only", in: ":8080", want: "8080"},
		{name: "host port", in: "127.0.0.1:8081", want: "8081"},
		{name: "trimmed", in: " localhost:9000 ", want: "9000"},
		{name: "raw suffix", in: "service:7000", want: "7000"},
	}
	for _, tc := range tests {
		if got := extractPort(tc.in); got != tc.want {
			t.Fatalf("%s: extractPort(%q)=%q want=%q", tc.name, tc.in, got, tc.want)
		}
	}
}

func TestAPIOriginTag(t *testing.T) {
	if got := apiOriginTag(":8080"); got != "API-8080" {
		t.Fatalf("unexpected tag: %q", got)
	}
	if got := apiOriginTag(""); got != "API" {
		t.Fatalf("unexpected fallback tag: %q", got)
	}
}
