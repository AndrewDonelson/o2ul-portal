package application

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"

	"com.nlaak.backend-template/pkg/lightclient"
	"com.nlaak.backend-template/pkg/proverclient"
	"com.nlaak.backend-template/pkg/walletguard"
)

//go:embed testdata/o2ul_blockchain_ethapi_headers.json
var embeddedBlockchainHeaderVectors []byte

//go:embed testdata/o2ul_blockchain_ethapi_headers_extended.json
var embeddedBlockchainHeaderVectorsExtended []byte

const WalletHeaderFixtureProfileEnv = "O2UL_WALLET_HEADER_FIXTURE_PROFILE"

const defaultWalletHeaderFixtureProfile = "ethapi-core"

type blockchainHeaderVector struct {
	Number     uint64 `json:"number"`
	ParentHash string `json:"parentHash"`
	StateRoot  string `json:"stateRoot"`
	BlockHash  string `json:"blockHash"`
}

func NewDefaultO2ULWalletService() (*O2ULWalletService, error) {
	profile := strings.TrimSpace(os.Getenv(WalletHeaderFixtureProfileEnv))
	rpcEndpoint := strings.TrimSpace(os.Getenv(WalletHeaderRPCURLEnv))
	return NewDefaultO2ULWalletServiceWithProfile(profile, rpcEndpoint)
}

func NewDefaultO2ULWalletServiceWithProfile(profile string, rpcEndpoint string) (*O2ULWalletService, error) {
	profile = strings.TrimSpace(profile)
	if profile == "" {
		profile = defaultWalletHeaderFixtureProfile
	}
	headerRPC, err := loadHeaderRPCForProfile(profile, rpcEndpoint)
	if err != nil {
		return nil, err
	}
	lc := lightclient.NewClient(headerRPC)
	pc := proverclient.NewClient(defaultLocalProver{}, defaultDelegatedProver{}, defaultPairingRegistry{})
	g, err := walletguard.NewGuard(2, map[walletguard.Factor]walletguard.Verifier{
		walletguard.FactorDevice:   nonEmptyAssertionVerifier{},
		walletguard.FactorPasskey:  nonEmptyAssertionVerifier{},
		walletguard.FactorGuardian: nonEmptyAssertionVerifier{},
	})
	if err != nil {
		return nil, err
	}
	return NewO2ULWalletService(lc, pc, g)
}

func loadHeaderRPCForProfile(profile string, rpcEndpoint string) (lightclient.HeaderRPC, error) {
	switch profile {
	case "ethapi-core", "ethapi-extended":
		headersByNumber, err := loadBlockchainHeaderVectorsForProfile(profile)
		if err != nil {
			return nil, err
		}
		return defaultHeaderRPC{headersByNumber: headersByNumber}, nil
	case "ethapi-http3-fixture":
		return newHTTP3HeaderRPC("https://fixtures.invalid", fixtureJSONRPCDoer{})
	case "ethapi-http3-rpc":
		endpoint := strings.TrimSpace(rpcEndpoint)
		if endpoint == "" {
			return nil, fmt.Errorf("%s is required when %s=ethapi-http3-rpc", WalletHeaderRPCURLEnv, WalletHeaderFixtureProfileEnv)
		}
		return newHTTP3HeaderRPC(endpoint, nil)
	default:
		return nil, unsupportedWalletHeaderProfileError(profile)
	}
}

func loadBlockchainHeaderVectorsForProfile(profile string) (map[uint64]lightclient.Header, error) {
	profiles := map[string][]byte{
		"ethapi-core":     embeddedBlockchainHeaderVectors,
		"ethapi-extended": embeddedBlockchainHeaderVectorsExtended,
	}
	encoded, ok := profiles[profile]
	if !ok {
		return nil, unsupportedWalletHeaderProfileError(profile)
	}

	var vectors []blockchainHeaderVector
	if err := json.Unmarshal(encoded, &vectors); err != nil {
		return nil, fmt.Errorf("decode blockchain header vectors: %w", err)
	}
	headersByNumber := make(map[uint64]lightclient.Header, len(vectors))
	for _, vector := range vectors {
		headersByNumber[vector.Number] = lightclient.Header{
			Number:     vector.Number,
			ParentHash: vector.ParentHash,
			StateRoot:  vector.StateRoot,
			BlockHash:  vector.BlockHash,
		}
	}
	return headersByNumber, nil
}

func unsupportedWalletHeaderProfileError(profile string) error {
	keys := []string{"ethapi-core", "ethapi-extended", "ethapi-http3-fixture", "ethapi-http3-rpc"}
	sort.Strings(keys)
	return fmt.Errorf("unsupported wallet header fixture profile %q (supported: %s)", profile, strings.Join(keys, ","))
}

type defaultHeaderRPC struct {
	headersByNumber map[uint64]lightclient.Header
}

func (d defaultHeaderRPC) HeaderByNumber(_ context.Context, number uint64) (lightclient.Header, error) {
	header, ok := d.headersByNumber[number]
	if !ok {
		return lightclient.Header{}, fmt.Errorf("blockchain header fixture not found: number=%d", number)
	}
	return header, nil
}

type defaultLocalProver struct{}

func (defaultLocalProver) Prove(_ context.Context, circuitID string, witness []byte) ([]byte, error) {
	return []byte("local:" + circuitID + ":" + string(witness)), nil
}

type defaultDelegatedProver struct{}

func (defaultDelegatedProver) RequestProof(_ context.Context, deviceID string, circuitID string, witness []byte) ([]byte, error) {
	return []byte("delegated:" + deviceID + ":" + circuitID + ":" + string(witness)), nil
}

type defaultPairingRegistry struct{}

func (defaultPairingRegistry) IsPaired(deviceID string) bool {
	return deviceID != ""
}

type nonEmptyAssertionVerifier struct{}

func (nonEmptyAssertionVerifier) Verify(_ walletguard.SpendIntent, assertion walletguard.Assertion) bool {
	return assertion.Payload != ""
}
