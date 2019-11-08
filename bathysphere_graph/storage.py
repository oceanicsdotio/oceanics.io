from ftplib import FTP as Base, error_perm


class FTP(Base):
    def __init__(self, host, timeout=4):
        # type: (str, int) -> FTP
        """
        Make a FTP connection

        :param host:
        :param timeout:
        :return:
        """
        Base.__init__(self, host, timeout=timeout)
        assert self.sock or "230" in self.login()  # attach if no open socket

    def change_directory(self, directory=None, ascend=0):
        # type: (str or [str], int) -> str
        """
        Change directories and/or ascend directory tree
        """
        cursor = None
        if ascend:
            cursor = self.cwd("/".join([".."] * ascend))

        if directory:
            if isinstance(directory, list):
                directory = "/".join(directory)
            elif not isinstance(directory, str):
                directory = "."
            cursor = self.cwd(directory)

        return cursor

    def list_directory(self, path=None, reset=False):
        # type: (str, bool) -> [str]
        """
        List contents of remote FTP directory

        :param path: path from FTP current directory
        :param reset: return connection cursor to parent directory
        :return:
        """
        if self.sock is None:
            status = self.login()  # attach if no open socket
            if "230" not in status:
                return None
        files = []
        cwd = self.change_directory(directory=("/".join(path) if path else None))
        self.retrlines("LIST", files.append)
        if reset:
            cwd = self.change_directory(ascend=1)
        return files, cwd

    def index_filesystem(self, path):
        # type: (str or [str]) -> dict or None
        """
        See if path exists, recursively.

        Move working directory back up one level, since using a persistent connection.

        :param path: path in remote directory
        :return:
        """
        try:
            files, _dir = self.list_directory(path=path, reset=False)
        except error_perm:
            return None, None
        if not files:
            return None, None

        _filesystem = dict()
        while files:
            file = files.pop()
            node = file.split().pop()
            sublevel, cwd = self.index_filesystem(path=[node])
            if sublevel:
                _filesystem[node] = sublevel

        cwd = self.change_directory(ascend=1)
        return _filesystem, cwd

    def retrieve(self, remote, local):
        # type: (str, str) -> bytes or None
        """
        Download data from FTP server.
        """
        fid = open(local, "wb+")
        try:
            return self.retrbinary(f"RETR {remote}", fid.write)
        except error_perm:
            return None

    @classmethod
    def sync(cls, host, remote, local):
        # type: (str, str, str) -> int
        ftp = cls(host, timeout=4)
        filesystem, cwd = ftp.index_filesystem(path="/")
        path = ftp.search(filesystem=filesystem, pattern=remote)
        return int(ftp.retrieve(remote=path, local=local))

    @classmethod
    def search(cls, filesystem, pattern):
        # type: (dict, str) -> None or str
        """
        Search a directory structure for a key. Call this on the result of `index_filesystem`

        :param filesystem: paths
        :param pattern: search key
        :return:
        """
        for key, level in filesystem.items():
            if key == pattern:
                return key
            try:
                result = cls.search(level, pattern)
            except AttributeError:
                result = None
            if result:
                return f"{key}/{result}"
        return None
