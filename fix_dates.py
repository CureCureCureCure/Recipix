import datetime
from git_filter_repo import RepoFilter

# Define a minimal configuration namespace class to satisfy the library's internal checks
class GitFilterRepoArgs:
    def __init__(self):
        self.force = True
        self.partial = False
        self.refs = None
        self.dry_run = False
        self.analyze = False
        # Callbacks expected by the internal setup loops
        self.commit_callback = None
        self.tag_callback = None
        self.reset_callback = None
        self.blob_callback = None
        self.filename_callback = None

# 40 commits distributed over 30 days
TOTAL_COMMITS = 40
DAYS_SPAN = 30
START_DATE = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=DAYS_SPAN)
INTERVAL = datetime.timedelta(days=DAYS_SPAN) / TOTAL_COMMITS

commit_counter = [0]

def commit_callback(commit, metadata):
    # Fix the author identity
    commit.author_name = b"CureCureCure"
    commit.author_email = b"fishpast3@proton.me"
    commit.committer_name = b"CureCureCure"
    commit.committer_email = b"fishpast3@proton.me"
    
    # Calculate unique staggered timestamp
    idx = commit_counter[0]
    new_date = START_DATE + (INTERVAL * idx)
    date_string = new_date.strftime("%Y-%m-%dT%H:%M:%S %z").encode('utf-8')
    
    commit.author_date = date_string
    commit.committer_date = date_string
    
    commit_counter[0] += 1

# Instantiate our custom arguments object
custom_args = GitFilterRepoArgs()

# Run the filter cleanly
RepoFilter(args=custom_args, commit_callback=commit_callback).run()
