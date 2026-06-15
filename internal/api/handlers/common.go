package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/pxzlin/wc-pre/internal/domain"
)

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, domain.ErrorResponse{
		Error: domain.APIError{Code: code, Message: message},
	})
}
