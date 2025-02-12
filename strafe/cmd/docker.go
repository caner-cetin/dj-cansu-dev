package cmd

import (
	"archive/tar"
	"bytes"
	"context"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/client"
	"github.com/fatih/color"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var (
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
		Short: "check if the *strafe* docker image exists (searched by the name in config file)",
		Run: func(cmd *cobra.Command, args []string) {
			err := imageExists()
			if err != nil {
				color.Red("image does not exist >///< %v \n", err)
				os.Exit(1)
			}
			color.Green("image exists!")
		},
	}
	buildImageCmd = &cobra.Command{
		Use:   "build",
		Short: "build the image with target configured by docker.image.name and .tag if the image does not exist already",
		Run: func(cmd *cobra.Command, args []string) {
			err := imageExists()
			if err == nil {
				color.Cyan("image already exists >.<")
				os.Exit(0)
			}
			buildImage()

		},
	}
	deleteImageCmd = &cobra.Command{
		Use:   "delete",
		Short: "delete the image with target configured by docker.image.name and .tag, if the image exists.",
		Run: func(cmd *cobra.Command, args []string) {
			err := imageExists()
			if err != nil {
				color.Red("image does not exist!")
				os.Exit(1)
			}
			deleteImage()

		},
	}
)

func getDockerRootCmd() *cobra.Command {
	imageRootCmd.AddCommand(imageExistsCmd)
	imageRootCmd.AddCommand(buildImageCmd)
	imageRootCmd.AddCommand(deleteImageCmd)
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

func buildImage() {
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute*10)
	defer cancel()
	docker := newDockerClient()
	buildCtx, err := createBuildContext(".")
	cobra.CheckErr(err)
	response, err := docker.ImageBuild(ctx, buildCtx, types.ImageBuildOptions{
		Tags: []string{getImageTag()},
	})
	cobra.CheckErr(err)
	body, err := io.ReadAll(response.Body)
	cobra.CheckErr(err)
	fmt.Println(string(body))
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

func deleteImage() {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second * 10)
	defer cancel()
	docker := newDockerClient()
	resp, err := docker.ImageRemove(ctx, getImageInfo().ID, image.RemoveOptions{Force: true})
	cobra.CheckErr(err)
	color.Green("image %s deleted successfully", resp[0].Untagged)
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
		fmt.Println(path)
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
