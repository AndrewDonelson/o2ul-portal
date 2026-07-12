package application

import (
	"context"
	"fmt"

	"com.nlaak.backend-template/pkg/lightclient"
	"com.nlaak.backend-template/pkg/proverclient"
	"com.nlaak.backend-template/pkg/walletguard"
)

type O2ULLightClient interface {
	FetchRange(ctx context.Context, start uint64, end uint64) ([]lightclient.Header, error)
}

type O2ULProverClient interface {
	GenerateProof(ctx context.Context, mode proverclient.Mode, req proverclient.Request) ([]byte, error)
}

type O2ULWalletGuard interface {
	Authorize(intent walletguard.SpendIntent, assertions []walletguard.Assertion) error
}

type O2ULWalletService struct {
	lightClient O2ULLightClient
	prover      O2ULProverClient
	guard       O2ULWalletGuard
}

func NewO2ULWalletService(lightClient O2ULLightClient, prover O2ULProverClient, guard O2ULWalletGuard) (*O2ULWalletService, error) {
	if lightClient == nil {
		return nil, fmt.Errorf("light client is required")
	}
	if prover == nil {
		return nil, fmt.Errorf("prover client is required")
	}
	if guard == nil {
		return nil, fmt.Errorf("wallet guard is required")
	}
	return &O2ULWalletService{lightClient: lightClient, prover: prover, guard: guard}, nil
}

func (s *O2ULWalletService) VerifyClientAgainstRange(ctx context.Context, start uint64, end uint64) ([]lightclient.Header, error) {
	return s.lightClient.FetchRange(ctx, start, end)
}

func (s *O2ULWalletService) AuthorizeSpend(intent walletguard.SpendIntent, assertions []walletguard.Assertion) error {
	return s.guard.Authorize(intent, assertions)
}

func (s *O2ULWalletService) GenerateSpendProof(ctx context.Context, mode proverclient.Mode, req proverclient.Request) ([]byte, error) {
	return s.prover.GenerateProof(ctx, mode, req)
}

func (s *O2ULWalletService) VerifyAuthorizeAndProve(
	ctx context.Context,
	headerStart uint64,
	headerEnd uint64,
	intent walletguard.SpendIntent,
	assertions []walletguard.Assertion,
	mode proverclient.Mode,
	proofReq proverclient.Request,
) ([]byte, error) {
	if _, err := s.lightClient.FetchRange(ctx, headerStart, headerEnd); err != nil {
		return nil, err
	}
	if err := s.guard.Authorize(intent, assertions); err != nil {
		return nil, err
	}
	proof, err := s.prover.GenerateProof(ctx, mode, proofReq)
	if err != nil {
		return nil, err
	}
	return proof, nil
}
