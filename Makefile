.PHONY: release
CURRENT_BRANCH := $(shell git branch --show-current)
PACKAGE_NAME := $(shell cat package.json | jq -r .name)
VERSION := $(shell cat package.json | jq -r .version)
PACKAGE_FILE_NAME := $(PACKAGE_NAME)-$(VERSION).tgz

tag-release:
	@tput setaf 4
	@echo "Packaging $(VERSION) of $(PACKAGE_NAME)"
	@tput sgr0
	@git fetch --all
	@npm pack
	@mv ${PACKAGE_FILE_NAME} .git/
	@git switch release
	@git rm -rf . || echo 'No files to delete'
	@git clean -fd
	@mv ./.git/$(PACKAGE_FILE_NAME) .
	@tar -zxf $(PACKAGE_FILE_NAME)
	@rm $(PACKAGE_FILE_NAME)
	@mv package/* .
	@rm -rf package
	@git add .
	@git commit -m "Release commit for $(VERSION)"
	@git tag "$(VERSION)"
	@git push --set-upstream origin release
	@git push --tags
	@git switch $(CURRENT_BRANCH)
