package email

import (
	"context"
	"fmt"
	"net"
	"net/smtp"
	"strings"
)

type SMTPSender struct {
	host     string
	port     string
	username string
	password string
}

func NewSMTPSender(host, port, username, password string) *SMTPSender {
	return &SMTPSender{
		host:     strings.TrimSpace(host),
		port:     strings.TrimSpace(port),
		username: strings.TrimSpace(username),
		password: password,
	}
}

func (s *SMTPSender) Send(ctx context.Context, from, to, subject, body string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if strings.TrimSpace(from) == "" || strings.TrimSpace(to) == "" {
		return fmt.Errorf("from and to are required")
	}
	if s.host == "" || s.port == "" || s.username == "" || strings.TrimSpace(s.password) == "" {
		return fmt.Errorf("smtp sender is not fully configured")
	}

	addr := net.JoinHostPort(s.host, s.port)
	auth := smtp.PlainAuth("", s.username, s.password, s.host)

	msg := "From: " + from + "\r\n" +
		"To: " + to + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/plain; charset=UTF-8\r\n" +
		"\r\n" +
		body + "\r\n"

	return smtp.SendMail(addr, auth, from, []string{to}, []byte(msg))
}
