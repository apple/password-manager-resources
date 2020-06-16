require 'json'
require 'set'

shared_websites = JSON.parse(File.read('quirks/websites-with-shared-credential-backends.json'))

seen_domains = Set.new
shared_websites.flatten.each do |domain|
  STDERR.puts "The domain '#{domain}' appears more than once!" if seen_domains.include?(domain)
  seen_domains << domain
end

exit(1) if seen_domains.count != shared_websites.flatten.count