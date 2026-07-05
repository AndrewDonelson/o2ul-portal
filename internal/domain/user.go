package domain

import (
	"strings"
	"time"
)

type Role string

const (
	RoleMasterAdmin Role = "master_admin"
	RoleAdmin       Role = "admin"
	RoleSysOp       Role = "sysop"
	RoleSystOp      Role = RoleSysOp // Deprecated alias kept for compatibility.
	RoleModerator   Role = "moderator"
	RoleSubscriber  Role = "subscriber"
	RoleRegistered  Role = "registered"
	RoleMember      Role = RoleRegistered // Deprecated alias kept for compatibility.
	RoleGuest       Role = "guest"
)

var rolePriority = map[Role]int{
	RoleGuest:       1,
	RoleRegistered:  2,
	RoleSubscriber:  3,
	RoleModerator:   4,
	RoleSysOp:       5,
	RoleAdmin:       6,
	RoleMasterAdmin: 7,
}

var roleAliases = map[Role]Role{
	Role("member"): RoleRegistered,
	Role("systop"): RoleSysOp,
}

type Player struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"`
	Role         Role      `json:"role"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

func CanActAs(current, required Role) bool {
	currentRole := NormalizeRole(current)
	requiredRole := NormalizeRole(required)
	currentPriority, currentOK := rolePriority[currentRole]
	requiredPriority, requiredOK := rolePriority[requiredRole]
	if !currentOK || !requiredOK {
		return false
	}
	return currentPriority >= requiredPriority
}

func NormalizeRole(role Role) Role {
	if canonical, ok := roleAliases[role]; ok {
		return canonical
	}
	return role
}

func ParseRole(raw string) (Role, bool) {
	r := NormalizeRole(Role(strings.ToLower(strings.TrimSpace(raw))))
	_, ok := rolePriority[r]
	return r, ok
}

func IsRegisteredUser(role Role) bool {
	r := NormalizeRole(role)
	return r != RoleGuest && IsValidRole(r)
}

func IsValidRole(role Role) bool {
	_, ok := rolePriority[NormalizeRole(role)]
	return ok
}

func CanAssignRole(assigner Role, target Role) bool {
	actor := NormalizeRole(assigner)
	wanted := NormalizeRole(target)

	if !IsValidRole(actor) || !IsValidRole(wanted) {
		return false
	}

	switch wanted {
	case RoleMasterAdmin:
		// Master admin is provisioned from env bootstrap only.
		return false
	case RoleAdmin:
		return actor == RoleMasterAdmin
	case RoleSysOp:
		return actor == RoleMasterAdmin || actor == RoleAdmin
	case RoleModerator:
		return actor == RoleMasterAdmin || actor == RoleAdmin || actor == RoleSysOp
	case RoleSubscriber, RoleRegistered:
		return actor == RoleMasterAdmin || actor == RoleAdmin || actor == RoleSysOp || actor == RoleModerator
	case RoleGuest:
		return false
	default:
		return false
	}
}
