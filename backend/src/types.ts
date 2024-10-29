export interface Metadata {
	SourceFile?: string;
	ExifToolVersion?: number;
	FileName?: string;
	Directory?: string;
	FileSize?: string;
	FileModifyDate?: string;
	FileAccessDate?: string;
	FileInodeChangeDate?: string;
	FilePermissions?: string;
	FileType?: string;
	FileTypeExtension?: string;
	MIMEType?: string;
	MPEGAudioVersion?: number;
	AudioLayer?: number;
	AudioBitrate?: string;
	SampleRate?: number;
	ChannelMode?: string;
	MSStereo?: string;
	IntensityStereo?: string;
	CopyrightFlag?: boolean;
	OriginalMedia?: boolean;
	Emphasis?: string;
	Encoder?: string;
	LameVBRQuality?: number;
	LameQuality?: number;
	LameMethod?: string;
	LameLowPassFilter?: string;
	LameBitrate?: string;
	LameStereoMode?: string;
	ID3Size?: number;
	Genre?: string;
	Year?: number;
	Track?: string;
	Comment?: string;
	Album?: string;
	Title?: string;
	Artist?: string;
	Band?: string;
	PictureMIMEType?: string;
	PictureType?: string;
	PictureDescription?: string;
	Picture?: string;
	DateTimeOriginal?: number;
	Duration?: string;
}

export interface TrackResponse {
	id: string;
	cover: string;
	info: {
		title?: string;
		artist?: string;
		album?: string;
		length: number;
		genre?: string;
		vocal_waveform: number[] | null;
		instrumental_waveform: number[];
		tempo: number;
		instrumental: boolean;
		key: string;
	};
	saved_album_name: string;
	cover_extension: string;
	saved_vocal_folder_path: string | null;
	saved_instrumental_folder_path: string;
}
