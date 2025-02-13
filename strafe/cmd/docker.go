package cmd

import (
	"archive/tar"
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/briandowns/spinner"
	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/client"
	"github.com/fatih/color"
	log "github.com/sirupsen/logrus"
	"github.com/spf13/cobra"

	"github.com/spf13/viper"
)

var (
	SourceFolder      string
	ImageBuildContext *bytes.Buffer
	dockerRootCmd     = &cobra.Command{
		Use:   "docker",
		Short: "docker commands",
	}
	imageRootCmd = &cobra.Command{
		Use:   "image",
		Short: "commands relevant to the image",
	}
	imageExistsCmd = &cobra.Command{
		Use:   "exists",
		Short: "check if image exists",
		Run: func(cmd *cobra.Command, args []string) {
			exitIfImage(DoesNotExist)
			color.Green("image exists!")
		},
	}
	buildImageCmd = &cobra.Command{
		Use:   "build [-D -dir]",
		Short: "build the image if it does not exist",
		Long: `builds the utility image if it does not exit already.
source code is required for building the image.
if you are running this command from the root of source code (the one with the Dockerfile in it), then this command will work fine.
if you are running from a different folder, use the --dir / -D flag to provide the source code folder.`,
		Run: buildImage,
	}
	removeImageCmd = &cobra.Command{
		Use:   "remove",
		Short: "remove the image",
		Run:   removeImage,
	}
	healthImageCmd = &cobra.Command{
		Use:   "health",
		Short: "check health of utilities inside the image",
		Run:   func(cmd *cobra.Command, args []string) {},
	}
)

func getDockerRootCmd() *cobra.Command {
	imageRootCmd.AddCommand(imageExistsCmd)
	buildImageCmd.PersistentFlags().StringVarP(&SourceFolder, "dir", "D", ".", "source code folder")
	imageRootCmd.AddCommand(buildImageCmd)
	imageRootCmd.AddCommand(removeImageCmd)
	dockerRootCmd.AddCommand(imageRootCmd)
	return dockerRootCmd
}

func newDockerClient() *client.Client {
	os.Setenv(client.DefaultDockerHost, viper.GetString(DOCKER_SOCKET))
	docker, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	cobra.CheckErr(err)
	return docker
}

func getImageTag() string {
	return fmt.Sprintf("%s:%s", viper.GetString(DOCKER_IMAGE_NAME), viper.GetString(DOCKER_IMAGE_TAG))
}

func imageExists() error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)
	defer cancel()
	docker := newDockerClient()
	_, _, err := docker.ImageInspectWithRaw(ctx, viper.GetString(DOCKER_IMAGE_NAME))
	return err
}

type ImageCheckCondition int

const (
	Exists       ImageCheckCondition = 0
	DoesNotExist ImageCheckCondition = 1
)

func exitIfImage(condition ImageCheckCondition) {
	err := imageExists()
	switch condition {
	case Exists:
		if err == nil {
			color.Cyan("image already exists >.<")
			os.Exit(0)
		}
	case DoesNotExist:
		if err != nil {
			color.Red("image does not exist >///<\n%v", err)
			os.Exit(1)
		}
	}
}

type BuildResponse struct {
	Stream string `json:"stream"`
	Error  string `json:"error"`
}

func buildImage(cmd *cobra.Command, args []string) {
	exitIfImage(Exists)
	s := spinner.New(spinner.CharSets[12], 100*time.Millisecond)
	s.Prefix = "Building image "
	s.Start()
	defer s.Stop()
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute*10)
	defer cancel()
	docker := newDockerClient()
	buildCtx, err := createBuildContext(SourceFolder)
	cobra.CheckErr(err)
	response, err := docker.ImageBuild(ctx, buildCtx, types.ImageBuildOptions{
		Tags: []string{getImageTag()},
	})
	cobra.CheckErr(err)
	decoder := json.NewDecoder(response.Body)
	for {
		var message BuildResponse
		if err := decoder.Decode(&message); err != nil {
			if err == io.EOF {
				break
			}
			cobra.CheckErr(err)
		}

		if message.Error != "" {
			s.Stop()
			log.Error(message.Error)
			s.Start()
			continue
		}

		if message.Stream != "" {
			cleanMsg := strings.TrimSuffix(message.Stream, "\n")
			if cleanMsg != "" {
				s.Stop()
				fmt.Println(cleanMsg)
				s.Start()
			}
		}
	}
}

func getImageInfo() image.Summary {
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute*10)
	defer cancel()
	docker := newDockerClient()
	filters := filters.NewArgs()
	filters.Add("reference", getImageTag())
	images, err := docker.ImageList(ctx, image.ListOptions{
		Filters: filters,
	})
	cobra.CheckErr(err)
	return images[0]
}

func removeImage(cmd *cobra.Command, args []string) {
	exitIfImage(DoesNotExist)
	reader := bufio.NewReader(os.Stdin)
	for {
		fmt.Print(color.RedString("this action will remove image %s, are you sure? [y/N] ", getImageTag()))
		s, _ := reader.ReadString('\n')
		if strings.ToLower(strings.TrimSpace(s)) == "n" || strings.TrimSpace(s) == "" {
			color.Cyan("wise choice, goodbye!")
			os.Exit(0)
		}
		if strings.ToLower(strings.TrimSpace(s)) == "y" {
			color.Magenta("removing image...")
			break
		}
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)
	defer cancel()
	docker := newDockerClient()
	resp, err := docker.ImageRemove(ctx, getImageInfo().ID, image.RemoveOptions{Force: true})
	cobra.CheckErr(err)
	color.Green("image %s removed successfully", resp[0].Untagged)
}

func createBuildContext(contextPath string) (*bytes.Buffer, error) {
	buf := new(bytes.Buffer)
	tw := tar.NewWriter(buf)
	defer tw.Close()

	err := filepath.Walk(contextPath, func(path string, info fs.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}
		relPath, err := filepath.Rel(contextPath, path)
		if err != nil {
			return err
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		header := &tar.Header{
			Name:    relPath,
			Size:    info.Size(),
			Mode:    int64(info.Mode()),
			ModTime: info.ModTime(),
		}
		if err := tw.WriteHeader(header); err != nil {
			return err
		}

		if _, err := tw.Write(data); err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		return nil, err
	}
	return buf, nil
}
