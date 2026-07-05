package application

import "com.nlaak.backend-template/internal/domain"

type RBACService struct{}

func NewRBACService() *RBACService {
	return &RBACService{}
}

func (s *RBACService) IsAllowed(current domain.Role, required domain.Role) bool {
	return domain.CanActAs(current, required)
}
