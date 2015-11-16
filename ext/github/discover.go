package github

import (
	"errors"
	"fmt"
	"strings"

	"golang.org/x/net/context"
	"gopkg.in/inconshreveable/log15.v2"
	"src.sourcegraph.com/sourcegraph/ext/github/githubcli"
	"src.sourcegraph.com/sourcegraph/fed"
	"src.sourcegraph.com/sourcegraph/fed/discover"
	"src.sourcegraph.com/sourcegraph/server/local"
	"src.sourcegraph.com/sourcegraph/store"
	"src.sourcegraph.com/sourcegraph/svc"
)

func init() {
	discover.QuickRepoFuncs = append(discover.QuickRepoFuncs, discoverRepo)
}

// discoverRepo implements the discovery process for a repo that might
// be hosted on GitHub. If it is not hosted on GitHub or on a GitHub Enterprise
// instance, a discover.NotFoundError is returned.
func discoverRepo(ctx context.Context, repo string) (discover.Info, error) {
	if strings.HasPrefix(strings.ToLower(repo), "github.com/") {
		return &discoveryInfo{host: "github.com"}, nil
	}
	if githubcli.Config.IsGitHubEnterprise() {
		gitHubHost := githubcli.Config.Host()
		if strings.HasPrefix(strings.ToLower(repo), gitHubHost+"/") {
			return &discoveryInfo{host: gitHubHost}, nil
		}
	}
	return nil, &discover.NotFoundError{Type: "repo", Input: repo}
}

type discoveryInfo struct {
	host string // GitHub hostname
}

func (i *discoveryInfo) NewContext(ctx context.Context) (context.Context, error) {
	if i.host != "github.com" && githubcli.Config.IsGitHubEnterprise() {
		log15.Debug("Serving GitHub Enterprise repo request locally")
		ctx = store.WithRepos(ctx, &Repos{})
		return svc.WithServices(ctx, local.Services), nil
	}
	if !fed.Config.IsRoot {
		if fed.Config.RootURL() == nil {
			return nil, errors.New("federation root URL not configured")
		}
		log15.Debug("Routing external repo request to root", "RootURL", fed.Config.RootURL().String())
		return fed.Config.NewRemoteContext(ctx), nil
	} else {
		log15.Debug("Serving GitHub repo request locally")
		ctx = store.WithRepos(ctx, &Repos{})
		return svc.WithServices(ctx, local.Services), nil
	}
}

func (i *discoveryInfo) String() string { return fmt.Sprintf("GitHub (%s)", i.host) }
