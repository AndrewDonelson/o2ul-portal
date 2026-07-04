package domain

import "testing"

func TestParseRoleSupportsCanonicalAndAliases(t *testing.T) {
	tests := []struct {
		name   string
		in     string
		want   Role
		wantOK bool
	}{
		{name: "canonical sysop", in: "sysop", want: RoleSysOp, wantOK: true},
		{name: "legacy systop alias", in: "systop", want: RoleSysOp, wantOK: true},
		{name: "legacy member alias", in: "member", want: RoleRegistered, wantOK: true},
		{name: "canonical registered", in: "registered", want: RoleRegistered, wantOK: true},
		{name: "invalid", in: "owner", want: "owner", wantOK: false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, ok := ParseRole(tc.in)
			if ok != tc.wantOK {
				t.Fatalf("ok mismatch: got=%v want=%v", ok, tc.wantOK)
			}
			if got != tc.want {
				t.Fatalf("role mismatch: got=%s want=%s", got, tc.want)
			}
		})
	}
}

func TestCanAssignRolePolicy(t *testing.T) {
	tests := []struct {
		name     string
		assigner Role
		target   Role
		want     bool
	}{
		{name: "master can assign admin", assigner: RoleMasterAdmin, target: RoleAdmin, want: true},
		{name: "admin cannot assign admin", assigner: RoleAdmin, target: RoleAdmin, want: false},
		{name: "admin can assign sysop", assigner: RoleAdmin, target: RoleSysOp, want: true},
		{name: "sysop can assign moderator", assigner: RoleSysOp, target: RoleModerator, want: true},
		{name: "moderator cannot assign sysop", assigner: RoleModerator, target: RoleSysOp, want: false},
		{name: "no one assigns master", assigner: RoleMasterAdmin, target: RoleMasterAdmin, want: false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := CanAssignRole(tc.assigner, tc.target)
			if got != tc.want {
				t.Fatalf("CanAssignRole(%s,%s)=%v want=%v", tc.assigner, tc.target, got, tc.want)
			}
		})
	}
}
