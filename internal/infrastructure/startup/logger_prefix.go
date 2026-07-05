package startup

import (
	"log"
	"strings"
)

func ConfigureProcessLogger(tag string) {
	normalized := strings.ToUpper(strings.TrimSpace(tag))
	if normalized != "" {
		log.SetPrefix("[" + normalized + "] ")
	}
	log.SetFlags(log.Ldate | log.Ltime | log.Lmsgprefix)
}
