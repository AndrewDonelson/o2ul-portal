package o2ul_files

type File struct {
	ID          string `json:"id"`
	UserID      string `json:"userId"`
	Name        string `json:"name"`
	ContentType string `json:"contentType"`
	StorageID   string `json:"storageId"`
	Size        int64  `json:"size"`
	MD5Hash     string `json:"md5Hash,omitempty"`
	CreatedAt   int64  `json:"createdAt"`
}

type UploadURL struct {
	URL       string `json:"url"`
	ExpiresAt int64  `json:"expiresAt"`
}
