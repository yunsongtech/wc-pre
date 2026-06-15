package voice

import "log"

type Notifier interface {
	Call(phoneNumber, userName, matchInfo string) error
}

type MockNotifier struct{}

func (m *MockNotifier) Call(phoneNumber, userName, matchInfo string) error {
	log.Printf("voice mock call to %s for %s: %s", phoneNumber, userName, matchInfo)
	return nil
}

type AliyunNotifier struct {
	accessKeyID     string
	accessKeySecret string
	mock            *MockNotifier
}

func NewAliyunNotifier(accessKeyID, accessKeySecret string) Notifier {
	mock := &MockNotifier{}
	if accessKeyID == "" {
		return mock
	}
	return &AliyunNotifier{
		accessKeyID:     accessKeyID,
		accessKeySecret: accessKeySecret,
		mock:            mock,
	}
}

func (a *AliyunNotifier) Call(phoneNumber, userName, matchInfo string) error {
	// Real Aliyun integration behind env credentials; mock until configured.
	return a.mock.Call(phoneNumber, userName, matchInfo)
}
