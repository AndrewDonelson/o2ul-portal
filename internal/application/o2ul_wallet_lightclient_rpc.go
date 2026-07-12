package application

import (
	"bytes"
	"context"
	"crypto/tls"
	_ "embed"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"com.nlaak.backend-template/pkg/lightclient"
	"github.com/quic-go/quic-go/http3"
)

const WalletHeaderRPCURLEnv = "O2UL_WALLET_LIGHTCLIENT_RPC_URL"

//go:embed testdata/o2ul_blockchain_ethapi_jsonrpc_header_number_0.json
var embeddedJSONRPCHeader0 []byte

//go:embed testdata/o2ul_blockchain_ethapi_jsonrpc_header_number_1.json
var embeddedJSONRPCHeader1 []byte

//go:embed testdata/o2ul_blockchain_ethapi_jsonrpc_header_number_9.json
var embeddedJSONRPCHeader9 []byte

//go:embed testdata/o2ul_blockchain_ethapi_jsonrpc_header_number_10.json
var embeddedJSONRPCHeader10 []byte

//go:embed testdata/o2ul_blockchain_ethapi_jsonrpc_header_number_11.json
var embeddedJSONRPCHeader11 []byte

//go:embed testdata/o2ul_blockchain_ethapi_jsonrpc_header_number_12.json
var embeddedJSONRPCHeader12 []byte

//go:embed testdata/o2ul_blockchain_ethapi_jsonrpc_header_number_13.json
var embeddedJSONRPCHeader13 []byte

//go:embed testdata/o2ul_blockchain_ethapi_jsonrpc_header_number_14.json
var embeddedJSONRPCHeader14 []byte

//go:embed testdata/o2ul_blockchain_ethapi_jsonrpc_header_number_15.json
var embeddedJSONRPCHeader15 []byte

//go:embed testdata/o2ul_blockchain_ethapi_jsonrpc_header_number_16.json
var embeddedJSONRPCHeader16 []byte

//go:embed testdata/o2ul_blockchain_ethapi_jsonrpc_header_number_17.json
var embeddedJSONRPCHeader17 []byte

//go:embed testdata/o2ul_blockchain_ethapi_jsonrpc_header_number_18.json
var embeddedJSONRPCHeader18 []byte

//go:embed testdata/o2ul_blockchain_ethapi_jsonrpc_header_number_19.json
var embeddedJSONRPCHeader19 []byte

//go:embed testdata/o2ul_blockchain_ethapi_jsonrpc_header_number_20.json
var embeddedJSONRPCHeader20 []byte

//go:embed testdata/o2ul_blockchain_ethapi_jsonrpc_header_number_21.json
var embeddedJSONRPCHeader21 []byte

type rpcDoer interface {
	Do(req *http.Request) (*http.Response, error)
}

type http3HeaderRPC struct {
	endpoint string
	doer     rpcDoer
}

type jsonRPCRequest struct {
	JSONRPC string `json:"jsonrpc"`
	ID      int    `json:"id"`
	Method  string `json:"method"`
	Params  []any  `json:"params"`
}

type headerResult struct {
	Number     string `json:"number"`
	ParentHash string `json:"parentHash"`
	StateRoot  string `json:"stateRoot"`
	Hash       string `json:"hash"`
}

type jsonRPCResponse struct {
	JSONRPC string        `json:"jsonrpc"`
	ID      int           `json:"id"`
	Result  *headerResult `json:"result"`
	Error   *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func newHTTP3HeaderRPC(endpoint string, doer rpcDoer) (*http3HeaderRPC, error) {
	endpoint = strings.TrimSpace(endpoint)
	if endpoint == "" {
		return nil, fmt.Errorf("wallet light-client rpc endpoint is required")
	}
	if !strings.HasPrefix(strings.ToLower(endpoint), "https://") {
		return nil, fmt.Errorf("wallet light-client rpc endpoint must be https for HTTP/3")
	}
	if doer == nil {
		doer = &http.Client{
			Transport: &http3.Transport{
				TLSClientConfig: &tls.Config{MinVersion: tls.VersionTLS13},
			},
		}
	}
	return &http3HeaderRPC{endpoint: endpoint, doer: doer}, nil
}

func (h *http3HeaderRPC) HeaderByNumber(ctx context.Context, number uint64) (lightclient.Header, error) {
	tag := "0x" + strconv.FormatUint(number, 16)
	request := jsonRPCRequest{
		JSONRPC: "2.0",
		ID:      1,
		Method:  "eth_getHeaderByNumber",
		Params:  []any{tag},
	}
	payload, err := json.Marshal(request)
	if err != nil {
		return lightclient.Header{}, err
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, h.endpoint, bytes.NewReader(payload))
	if err != nil {
		return lightclient.Header{}, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	resp, err := h.doer.Do(httpReq)
	if err != nil {
		return lightclient.Header{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return lightclient.Header{}, fmt.Errorf("wallet light-client rpc status %d", resp.StatusCode)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return lightclient.Header{}, err
	}
	var parsed jsonRPCResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return lightclient.Header{}, err
	}
	if parsed.Error != nil {
		return lightclient.Header{}, fmt.Errorf("wallet light-client rpc error %d: %s", parsed.Error.Code, parsed.Error.Message)
	}
	if parsed.Result == nil {
		return lightclient.Header{}, fmt.Errorf("blockchain header fixture not found: number=%d", number)
	}
	parsedNumber, err := parseHexUint64(parsed.Result.Number)
	if err != nil {
		return lightclient.Header{}, err
	}
	return lightclient.Header{
		Number:     parsedNumber,
		ParentHash: parsed.Result.ParentHash,
		StateRoot:  parsed.Result.StateRoot,
		BlockHash:  parsed.Result.Hash,
	}, nil
}

func parseHexUint64(raw string) (uint64, error) {
	clean := strings.TrimPrefix(strings.ToLower(strings.TrimSpace(raw)), "0x")
	if clean == "" {
		return 0, fmt.Errorf("invalid hex number %q", raw)
	}
	parsed, err := strconv.ParseUint(clean, 16, 64)
	if err != nil {
		return 0, err
	}
	return parsed, nil
}

type fixtureJSONRPCDoer struct{}

func (fixtureJSONRPCDoer) Do(req *http.Request) (*http.Response, error) {
	body, err := io.ReadAll(req.Body)
	if err != nil {
		return nil, err
	}
	var rpcReq jsonRPCRequest
	if err := json.Unmarshal(body, &rpcReq); err != nil {
		return nil, err
	}
	if rpcReq.Method != "eth_getHeaderByNumber" || len(rpcReq.Params) == 0 {
		return fixtureResponse(http.StatusBadRequest, []byte(`{"jsonrpc":"2.0","id":1,"error":{"code":-32601,"message":"unsupported method"}}`)), nil
	}
	tag, _ := rpcReq.Params[0].(string)
	switch strings.ToLower(tag) {
	case "0x0":
		return fixtureResponse(http.StatusOK, embeddedJSONRPCHeader0), nil
	case "0x1":
		return fixtureResponse(http.StatusOK, embeddedJSONRPCHeader1), nil
	case "0x9":
		return fixtureResponse(http.StatusOK, embeddedJSONRPCHeader9), nil
	case "0xa":
		return fixtureResponse(http.StatusOK, embeddedJSONRPCHeader10), nil
	case "0xb":
		return fixtureResponse(http.StatusOK, embeddedJSONRPCHeader11), nil
	case "0xc":
		return fixtureResponse(http.StatusOK, embeddedJSONRPCHeader12), nil
	case "0xd":
		return fixtureResponse(http.StatusOK, embeddedJSONRPCHeader13), nil
	case "0xe":
		return fixtureResponse(http.StatusOK, embeddedJSONRPCHeader14), nil
	case "0xf":
		return fixtureResponse(http.StatusOK, embeddedJSONRPCHeader15), nil
	case "0x10":
		return fixtureResponse(http.StatusOK, embeddedJSONRPCHeader16), nil
	case "0x11":
		return fixtureResponse(http.StatusOK, embeddedJSONRPCHeader17), nil
	case "0x12":
		return fixtureResponse(http.StatusOK, embeddedJSONRPCHeader18), nil
	case "0x13":
		return fixtureResponse(http.StatusOK, embeddedJSONRPCHeader19), nil
	case "0x14":
		return fixtureResponse(http.StatusOK, embeddedJSONRPCHeader20), nil
	case "0x15":
		return fixtureResponse(http.StatusOK, embeddedJSONRPCHeader21), nil
	default:
		return fixtureResponse(http.StatusOK, []byte(`{"jsonrpc":"2.0","id":1,"result":null}`)), nil
	}
}

func fixtureResponse(status int, payload []byte) *http.Response {
	return &http.Response{
		StatusCode: status,
		Body:       io.NopCloser(bytes.NewReader(payload)),
		Header:     make(http.Header),
	}
}
